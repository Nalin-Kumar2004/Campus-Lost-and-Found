import bcrypt from 'bcrypt';

/**
 * Hash a plain text password using bcrypt
 * 
 * When user signs up with password "MyPassword123!", we don't store it as-is
 * We hash it so even if database leaks, attackers can't use passwords
 * 
 * bcrypt specifics:
 * - Cost factor: 10 (means 2^10 = 1024 iterations)
 * - Each hash takes ~100ms (intentionally slow to prevent brute force)
 * - Automatically generates and includes salt in output
 * 
 * @param password - Plain text password from user
 * @returns Promise resolving to hashed password string
 * 
 * Example:
 * Input:  "MyPassword123!"
 * Output: "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36DRcx76"
 */
export const hashPassword = async (password: string): Promise<string> => {
  // Cost factor 10: 2^10 = 1024 iterations, ~100ms per hash
  // Higher = more secure but slower (consider user experience)
  const saltRounds = 10;

  try {
    // bcrypt.hash() does:
    // 1. Generates random salt
    // 2. Hashes password 1024 times with salt
    // 3. Returns: $2b$10$[salt][hashed_password]
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    return hashedPassword;
  } catch (error) {
    // If bcrypt fails (rare), throw meaningful error
    throw new Error('Failed to hash password');
  }
};

/**
 * Compare plain text password with stored hash
 * 
 * When user logs in with password, we:
 * 1. Get their stored hash from database
 * 2. Hash the password they entered (with same salt from stored hash)
 * 3. Compare the result - if match, password correct!
 * 
 * @param password - Plain text password user entered during login
 * @param hash - Stored hash from database
 * @returns Promise resolving to true if match, false otherwise
 * 
 * Example:
 * password = "MyPassword123!"
 * hash = "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36DRcx76"
 * Returns: true (password matches)
 */
export const comparePassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  try {
    // bcrypt.compare() does:
    // 1. Extracts salt from stored hash
    // 2. Hashes input password using same salt
    // 3. Compares result with stored hash
    // 4. Returns true if match, false otherwise
    const isMatch = await bcrypt.compare(password, hash);
    return isMatch;
  } catch (error) {
    throw new Error('Failed to compare password');
  }
};

/**
 * Validate password meets security requirements
 * 
 * We enforce:
 * - Minimum 8 characters (long enough to resist brute force)
 * - At least 1 uppercase (prevents simple passwords)
 * - At least 1 lowercase (prevents simple passwords)
 * - At least 1 number (common requirement)
 * - At least 1 special character (harder to guess)
 * 
 * Why enforce these?
 * - Weak passwords = easy to crack (dictionary attacks)
 * - "password123" can be guessed in seconds
 * - "P@ssw0rd!xY" takes much longer
 * 
 * @param password - Plain text password to validate
 * @returns Object with isValid boolean and reason if invalid
 * 
 * Example:
 * Input:  "weak"
 * Output: { isValid: false, reason: "Password must be at least 8 characters" }
 * 
 * Input:  "MyPassword123!"
 * Output: { isValid: true }
 */
export const validatePasswordStrength = (
  password: string
): { isValid: boolean; reason?: string } => {
  // Check 1: Minimum length
  if (password.length < 8) {
    return { isValid: false, reason: 'Password must be at least 8 characters' };
  }

  // Check 2: At least one uppercase letter (A-Z)
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, reason: 'Password must contain uppercase letter (A-Z)' };
  }

  // Check 3: At least one lowercase letter (a-z)
  if (!/[a-z]/.test(password)) {
    return { isValid: false, reason: 'Password must contain lowercase letter (a-z)' };
  }

  // Check 4: At least one number (0-9)
  if (!/[0-9]/.test(password)) {
    return { isValid: false, reason: 'Password must contain number (0-9)' };
  }

  // Check 5: At least one special character
  if (!/[!@#$%^&*]/.test(password)) {
    return { isValid: false, reason: 'Password must contain special character (!@#$%^&*)' };
  }

  // All checks passed!
  return { isValid: true };
};
