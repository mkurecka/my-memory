// Password hashing using Web Crypto API
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);

  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Import key
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    data,
    'PBKDF2',
    false,
    ['deriveBits']
  );

  // Derive key
  const derived = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  // Combine salt + hash
  const hashArray = new Uint8Array(derived);
  const combined = new Uint8Array(salt.length + hashArray.length);
  combined.set(salt);
  combined.set(hashArray, salt.length);

  // Encode to base64
  return btoa(String.fromCharCode(...combined));
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    // Decode from base64
    const combined = Uint8Array.from(atob(hash), c => c.charCodeAt(0));

    // Extract salt and hash
    const salt = combined.slice(0, 16);
    const storedHash = combined.slice(16);

    // Hash the input password with the same salt
    const encoder = new TextEncoder();
    const data = encoder.encode(password);

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      data,
      'PBKDF2',
      false,
      ['deriveBits']
    );

    const derived = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      256
    );

    const hashArray = new Uint8Array(derived);

    // Compare hashes
    if (hashArray.length !== storedHash.length) {
      return false;
    }

    for (let i = 0; i < hashArray.length; i++) {
      if (hashArray[i] !== storedHash[i]) {
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}
