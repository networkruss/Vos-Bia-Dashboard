// src/app/api/auth/login/route.ts
import { NextResponse } from "next/server";

const DIRECTUS_URL = "http://100.126.246.124:8060";

// Map positions to roles
function getUserRole(position: string, isAdmin: boolean): string {
  if (!position) return "encoder";

  const positionLower = position.toLowerCase();

  // Check if user is admin first
  if (isAdmin) return "executive";

  // Executive roles
  if (
    positionLower.includes("ceo") ||
    positionLower.includes("chief executive") ||
    positionLower.includes("chief operating") ||
    positionLower.includes("coo") ||
    positionLower.includes("general manager") ||
    positionLower.includes("president")
  ) {
    return "executive";
  }

  // Manager roles
  if (
    positionLower.includes("manager") ||
    positionLower.includes("head") ||
    positionLower.includes("supervisor") ||
    positionLower.includes("officer")
  ) {
    return "manager";
  }

  // Sales roles
  if (
    positionLower.includes("sales") ||
    positionLower.includes("salesman") ||
    positionLower.includes("business development") ||
    positionLower.includes("marketing")
  ) {
    return "salesman";
  }

  // Default to encoder for all other positions
  return "encoder";
}

// Check if user is COO/Executive with full access
function checkIsCOO(position: string, isAdmin: boolean): boolean {
  if (!position) return false;

  const positionLower = position.toLowerCase();

  // Check if user is admin or has executive position
  if (isAdmin) return true;

  if (
    positionLower.includes("ceo") ||
    positionLower.includes("chief executive") ||
    positionLower.includes("chief operating") ||
    positionLower.includes("coo") ||
    positionLower.includes("general manager") ||
    positionLower.includes("president")
  ) {
    return true;
  }

  return false;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    // Fetch all users from Directus
    const usersResponse = await fetch(`${DIRECTUS_URL}/items/user?limit=-1`, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!usersResponse.ok) {
      console.error(
        "Failed to fetch users from Directus:",
        usersResponse.status
      );
      return NextResponse.json(
        { error: "Failed to connect to authentication service" },
        { status: 500 }
      );
    }

    const usersData = await usersResponse.json();
    const users = usersData.data || [];

    if (!Array.isArray(users) || users.length === 0) {
      return NextResponse.json(
        { error: "No users available" },
        { status: 500 }
      );
    }

    // Find user by email or username (case-insensitive)
    const user = users.find((u: any) => {
      const userEmail = u.user_email?.toLowerCase() || "";
      const userFname = u.user_fname?.toLowerCase() || "";
      const inputLower = username.toLowerCase();

      return userEmail === inputLower || userFname === inputLower;
    });

    if (!user) {
      console.log("User not found for username:", username);
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Check if user is deleted
    if (
      user.is_deleted &&
      user.is_deleted.data &&
      user.is_deleted.data[0] === 1
    ) {
      return NextResponse.json(
        { error: "Account has been deactivated" },
        { status: 401 }
      );
    }

    // Verify password
    if (!user.user_password || user.user_password !== password) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Determine user role based on position and isAdmin flag
    const userRole = getUserRole(
      user.user_position || "",
      user.isAdmin || false
    );

    // Check if user is COO/Executive with full dashboard access
    const isCOO = checkIsCOO(
      user.user_position || "",
      user.isAdmin || false
    );

    // Generate token
    const token = Buffer.from(
      `${user.user_id}:${user.user_email}:${Date.now()}`
    ).toString("base64");

    // Prepare user response
    const userResponse = {
      id: user.user_id,
      username: user.user_fname || user.user_email,
      email: user.user_email || "",
      role: userRole,
      name: `${user.user_fname || ""} ${user.user_lname || ""}`.trim(),
      position: user.user_position || "",
      isAdmin: user.isAdmin || false,
      isCOO: isCOO, // Add isCOO flag to user response
    };

    console.log("Login successful:", {
      email: userResponse.email,
      role: userResponse.role,
      position: user.user_position,
      isAdmin: user.isAdmin,
      isCOO: isCOO,
    });

    return NextResponse.json({
      success: true,
      token,
      user: userResponse,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "An error occurred during login: " + (error as Error).message },
      { status: 500 }
    );
  }
}