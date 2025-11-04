function simpleHash(password, salt) {
    let hash = '';
    const combinedString = password + salt;
    for (let i = 0; i < combinedString.length; i++) {
        hash += (combinedString.charCodeAt(i) * 31).toString(16);
    }
    return hash;
}

function generateSalt(rounds) {
    const chars = 'abcdef0123456789';
    let salt = '';
    for (let i = 0; i < rounds; i++) {
        salt += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return salt;
}

function hash(password, salt) {
    if (password == null || salt == null) {
        throw new Error('Must Provide Password and salt values');
    }
    if (typeof password !== 'string' || typeof salt !== 'string') {
        throw new Error('password must be a string and salt must either be a salt string or a number of rounds');
    }
    const hashedValue = simpleHash(password, salt);
    return { salt: salt, hashedpassword: hashedValue };
}

// Pre-generated hashed passwords
const mockUsers = [
    {
        username: 'user1',
        salt: 'abc123',
        hashedpassword: simpleHash('pass123', 'abc123'),
        name: 'Test User'
    },
    {
        username: 'admin',
        salt: 'def456',
        hashedpassword: simpleHash('admin123', 'def456'),
        name: 'Administrator'
    }
];

export const authenticateUser = async (username, password) => {
    try {
        console.log('Attempting login with:', { username });
        const user = mockUsers.find(u => u.username === username);
        
        if (!user) {
            console.log('User not found');
            throw new Error('Invalid credentials');
        }

        console.log('Comparing passwords');
        const hashedAttempt = hash(password, user.salt);
        
        if (hashedAttempt.hashedpassword !== user.hashedpassword) {
            console.log('Password invalid');
            throw new Error('Invalid credentials');
        }

        console.log('Login successful');
        return {
            success: true,
            user: {
                username: user.username,
                name: user.name
            }
        };
    } catch (error) {
        throw { success: false, message: error.message };
    }
};

// Utility function to hash new passwords
export const hashNewPassword = (password) => {
    const salt = generateSalt(12);
    return hash(password, salt);
};