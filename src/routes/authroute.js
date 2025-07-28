// routes/auth.js
const express = require("express");
const { supabase, supabaseAdmin } = require("../lib/supabase");
const { authenticateUser } = require("../middleware/auth");

const router = express.Router();

// Login user
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Authenticate with Supabase
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Get user profile with organization and role
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select(
        `
        *,
        organization:organizations(*),
        role:roles(*)
      `
      )
      .eq("id", authData.user.id)
      .single();

    if (profileError) {
      return res.status(404).json({ error: "User profile not found" });
    }

    // Check if user is active
    if (!profile.is_active) {
      return res.status(403).json({ error: "Account is deactivated" });
    }

    res.json({
      message: "Login successful",
      user: {
        id: authData.user.id,
        email: authData.user.email,
        profile: profile,
      },
      session: {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_at: authData.session.expires_at,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

// Register individual user (joins existing organization)
router.post("/register", async (req, res) => {
  try {
    const { email, password, organization_id, invite_code } = req.body;

    if (!email || !password || !organization_id) {
      return res.status(400).json({
        error: "Email, password, and organization_id are required",
      });
    }

    // Verify organization exists
    const { data: organization, error: orgError } = await supabase
      .from("organizations")
      .select("id, name")
      .eq("id", organization_id)
      .single();

    if (orgError || !organization) {
      return res.status(404).json({ error: "Organization not found" });
    }

    // TODO: Validate invite_code if your system uses them
    // For now, we'll skip invite code validation

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          organization_id: organization_id,
        },
      },
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    // Get default role for the organization (or create one)
    let { data: defaultRole, error: roleError } = await supabase
      .from("roles")
      .select("*")
      .eq("organization_id", organization_id)
      .eq("name", "user")
      .single();

    // If no default role exists, create one
    if (roleError || !defaultRole) {
      const { data: newRole, error: createRoleError } = await supabase
        .from("roles")
        .insert([
          {
            name: "user",
            organization_id: organization_id,
            permissions: ["view_analytics"], // Basic permissions
          },
        ])
        .select()
        .single();

      if (createRoleError) throw createRoleError;
      defaultRole = newRole;
    }

    // Create user profile
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .insert([
        {
          id: authData.user.id,
          email: email,
          organization_id: organization_id,
          role_id: defaultRole.id,
        },
      ])
      .select(
        `
        *,
        organization:organizations(*),
        role:roles(*)
      `
      )
      .single();

    if (profileError) {
      // Cleanup: delete auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    res.status(201).json({
      message:
        "Registration successful. Please check your email to verify your account.",
      user: {
        id: authData.user.id,
        email: authData.user.email,
        profile: profile,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
});

// Logout (invalidate session)
router.post("/logout", authenticateUser, async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: "Logout successful" });
  } catch (error) {
    res.status(500).json({ error: "Logout failed" });
  }
});

// Get current user info
router.get("/me", authenticateUser, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        profile: req.user.profile,
      },
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Refresh token
router.post("/refresh", async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({ error: "Refresh token is required" });
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token,
    });

    if (error) {
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    res.json({
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Token refresh failed" });
  }
});

// Request password reset
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL}/reset-password`,
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: "Password reset email sent" });
  } catch (error) {
    res.status(500).json({ error: "Password reset failed" });
  }
});

// Update password
router.post("/update-password", authenticateUser, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: "New password is required" });
    }

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ error: "Password update failed" });
  }
});

module.exports = router;
