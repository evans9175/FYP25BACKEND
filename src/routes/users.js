// routes/users.js
const express = require("express");
const { supabase, supabaseAdmin } = require("../lib/supabase");
const {
  authenticateUser,
  requireRole,
  requirePermission,
} = require("../middleware/auth");

const router = express.Router();

// Get current user profile
router.get("/profile", authenticateUser, async (req, res) => {
  try {
    const { data: profile, error } = await supabase
      .from("user_profiles")
      .select(
        `
        *,
        organization:organizations(*),
        role:roles(*)
      `
      )
      .eq("id", req.user.id)
      .single();

    if (error) throw error;

    res.json({ profile });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update user profile
router.put("/profile", authenticateUser, async (req, res) => {
  try {
    const { wallet_address } = req.body;

    const { data, error } = await supabase
      .from("user_profiles")
      .update({ wallet_address })
      .eq("id", req.user.id)
      .select()
      .single();

    if (error) throw error;

    res.json({ profile: data });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all users in organization (admin only)
router.get(
  "/organization/:orgId/users",
  authenticateUser,
  requirePermission("manage_users"),
  async (req, res) => {
    try {
      const { orgId } = req.params;

      // Verify user belongs to this organization
      if (req.user.profile.organization_id !== orgId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const { data: users, error } = await supabase
        .from("user_profiles")
        .select(
          `
          *,
          role:roles(name, permissions)
        `
        )
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      res.json({ users });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

// Create new user (admin only)
router.post(
  "/organization/:orgId/users",
  authenticateUser,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { email, role_id, temporary_password } = req.body;
      const { orgId } = req.params;

      // Verify admin belongs to this organization
      if (req.user.profile.organization_id !== orgId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Create user in Supabase Auth
      const { data: authUser, error: authError } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          password: temporary_password || generateTemporaryPassword(),
          email_confirm: true,
          user_metadata: {
            organization_id: orgId,
          },
        });

      if (authError) throw authError;

      // Create user profile
      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .insert([
          {
            id: authUser.user.id,
            email,
            organization_id: orgId,
            role_id,
          },
        ])
        .select(
          `
          *,
          role:roles(name, permissions)
        `
        )
        .single();

      if (profileError) {
        // Cleanup: delete auth user if profile creation fails
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
        throw profileError;
      }

      res.json({
        user: profile,
        message:
          "User created successfully. They will receive an email to set their password.",
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

// Get user permissions
router.get("/permissions", authenticateUser, async (req, res) => {
  try {
    const permissions = req.user.profile?.role?.permissions || [];
    const role = req.user.profile?.role?.name || "none";

    res.json({
      permissions,
      role,
      organization_id: req.user.profile?.organization_id,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Helper function to generate temporary password
function generateTemporaryPassword() {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

module.exports = router;
