// middleware/auth.js
const { supabase } = require("../lib/supabase");

// Authenticate user from JWT token
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.replace("Bearer ", "");

    // Verify token with Supabase
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // Get user profile with organization and role data
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select(
        `
        *,
        organization:organizations(*),
        role:roles(*)
      `
      )
      .eq("id", user.id)
      .single();

    if (profileError) {
      return res.status(401).json({ error: "User profile not found" });
    }

    // Check if user is active
    if (!profile.is_active) {
      return res.status(403).json({ error: "Account is deactivated" });
    }

    // Attach user info to request
    req.user = {
      ...user,
      profile,
    };

    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(401).json({ error: "Authentication failed" });
  }
};

// Check if user has specific permission
const requirePermission = (permission) => {
  return (req, res, next) => {
    try {
      const userPermissions = req.user.profile?.role?.permissions || [];

      if (!userPermissions.includes(permission)) {
        return res.status(403).json({
          error: `Insufficient permissions. Required: ${permission}`,
        });
      }

      next();
    } catch (error) {
      res.status(403).json({ error: "Permission check failed" });
    }
  };
};

// Check if user has specific role
const requireRole = (roleName) => {
  return (req, res, next) => {
    try {
      const userRole = req.user.profile?.role?.name;

      if (userRole !== roleName) {
        return res.status(403).json({
          error: `Access denied. Required role: ${roleName}`,
        });
      }

      next();
    } catch (error) {
      res.status(403).json({ error: "Role check failed" });
    }
  };
};

module.exports = {
  authenticateUser,
  requirePermission,
  requireRole,
};
