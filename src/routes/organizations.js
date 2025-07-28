// routes/organizations.js
const express = require("express");
const { supabase, supabaseAdmin } = require("../lib/supabase");
const {
  authenticateUser,
  requireRole,
  requirePermission,
} = require("../middleware/auth");
const { createOrganization } = require("../utils/entityUtils");
const prisma = require("../utils/prisma");

const router = express.Router();

// Register new organization (public endpoint)
router.post("/register", async (req, res) => {
  try {
    const {
      name,
      registration_number,
      industry,
      admin_email,
      admin_password,
      blockchain_address,
    } = req.body;

    // Validate required fields
    if (!name || !admin_email || !admin_password) {
      return res.status(400).json({
        error: "Name, admin email, and password are required",
      });
    }

    // Create organization
    const { data: organization, error: orgError } = await supabase
      .from("organizations")
      .insert([
        {
          name,
          registration_number,
          industry,
          blockchain_address,
        },
      ])
      .select()
      .single();

    if (orgError) throw orgError;

    // Create admin user in Supabase Auth
    const { data: authUser, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: admin_email,
        password: admin_password,
        email_confirm: true,
        user_metadata: {
          organization_id: organization.id,
          role: "admin",
        },
      });

    if (authError) {
      // Cleanup: delete organization if user creation fails
      await supabase.from("organizations").delete().eq("id", organization.id);
      throw authError;
    }

    // Create admin role for this organization
    const { data: adminRole, error: roleError } = await supabase
      .from("roles")
      .insert([
        {
          name: "admin",
          organization_id: organization.id,
          permissions: [
            "manage_users",
            "manage_roles",
            "manage_settings",
            "view_analytics",
            "manage_audits",
          ],
        },
      ])
      .select()
      .single();

    if (roleError) throw roleError;

    // Create user profile
    const { data: userProfile, error: profileError } = await supabase
      .from("user_profiles")
      .insert([
        {
          id: authUser.user.id,
          email: admin_email,
          organization_id: organization.id,
          role_id: adminRole.id,
        },
      ])
      .select()
      .single();

    if (profileError) throw profileError;

    res.status(201).json({
      message: "Organization registered successfully",
      organization: {
        id: organization.id,
        name: organization.name,
        registration_number: organization.registration_number,
        industry: organization.industry,
      },
      admin: {
        id: userProfile.id,
        email: userProfile.email,
        role: "admin",
      },
    });
  } catch (error) {
    console.error("Organization registration error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Get organization details
router.get("/:orgId", authenticateUser, async (req, res) => {
  try {
    const { orgId } = req.params;

    // Verify user belongs to this organization
    if (req.user.profile.organization_id !== orgId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const { data: organization, error } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", orgId)
      .single();

    if (error) throw error;

    res.json({ organization });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update organization details (admin only)
router.put(
  "/:orgId",
  authenticateUser,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { orgId } = req.params;
      const { name, industry, blockchain_address } = req.body;

      // Verify admin belongs to this organization
      if (req.user.profile.organization_id !== orgId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const { data: organization, error } = await supabase
        .from("organizations")
        .update({ name, industry, blockchain_address })
        .eq("id", orgId)
        .select()
        .single();

      if (error) throw error;

      res.json({ organization });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

// Get organization roles
router.get("/:orgId/roles", authenticateUser, async (req, res) => {
  try {
    const { orgId } = req.params;

    // Verify user belongs to this organization
    if (req.user.profile.organization_id !== orgId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const { data: roles, error } = await supabase
      .from("roles")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    res.json({ roles });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Create new role (admin only)
router.post(
  "/:orgId/roles",
  authenticateUser,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { orgId } = req.params;
      const { name, permissions } = req.body;

      // Verify admin belongs to this organization
      if (req.user.profile.organization_id !== orgId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Validate permissions array
      const validPermissions = [
        "manage_users",
        "manage_roles",
        "manage_settings",
        "view_analytics",
        "manage_audits",
        "view_reports",
      ];

      const invalidPermissions = permissions.filter(
        (p) => !validPermissions.includes(p)
      );
      if (invalidPermissions.length > 0) {
        return res.status(400).json({
          error: `Invalid permissions: ${invalidPermissions.join(", ")}`,
        });
      }

      const { data: role, error } = await supabase
        .from("roles")
        .insert([
          {
            name,
            organization_id: orgId,
            permissions,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      res.status(201).json({ role });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

// Update role (admin only)
router.put(
  "/:orgId/roles/:roleId",
  authenticateUser,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { orgId, roleId } = req.params;
      const { name, permissions } = req.body;

      // Verify admin belongs to this organization
      if (req.user.profile.organization_id !== orgId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const { data: role, error } = await supabase
        .from("roles")
        .update({ name, permissions })
        .eq("id", roleId)
        .eq("organization_id", orgId) // Extra security check
        .select()
        .single();

      if (error) throw error;

      res.json({ role });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

// Get organization settings
router.get(
  "/:orgId/settings",
  authenticateUser,
  requirePermission("manage_settings"),
  async (req, res) => {
    try {
      const { orgId } = req.params;

      // Verify user belongs to this organization
      if (req.user.profile.organization_id !== orgId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const { data: settings, error } = await supabase
        .from("system_settings")
        .select("*")
        .eq("organization_id", orgId);

      if (error) throw error;

      // Convert array to object for easier frontend use
      const settingsObject = {};
      settings.forEach((setting) => {
        settingsObject[setting.setting_key] = setting.setting_value;
      });

      res.json({ settings: settingsObject });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

// Update organization setting
router.put(
  "/:orgId/settings/:settingKey",
  authenticateUser,
  requirePermission("manage_settings"),
  async (req, res) => {
    try {
      const { orgId, settingKey } = req.params;
      const { value } = req.body;

      // Verify user belongs to this organization
      if (req.user.profile.organization_id !== orgId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const { data: setting, error } = await supabase
        .from("system_settings")
        .upsert([
          {
            organization_id: orgId,
            setting_key: settingKey,
            setting_value: value,
            updated_by: req.user.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      res.json({ setting });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

// Create a new organization
router.post("/", async (req, res) => {
  try {
    const org = await createOrganization(req.body);
    res.status(201).json(org);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update an organization
router.put("/:id", async (req, res) => {
  try {
    const org = await prisma.organization.update({
      where: { id: parseInt(req.params.id) },
      data: req.body,
    });
    res.json(org);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete an organization
router.delete("/:id", async (req, res) => {
  try {
    await prisma.organization.delete({
      where: { id: parseInt(req.params.id) },
    });
    res.status(204).end();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all organizations
router.get("/", async (req, res) => {
  try {
    const orgs = await prisma.organization.findMany();
    res.json(orgs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a specific organization by ID
router.get("/:id", async (req, res) => {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!org) return res.status(404).json({ error: "Organization not found" });
    res.json(org);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
