const crypto = require('crypto');

function generateSalt(rounds) {
    return crypto.randomBytes(rounds).toString('hex').slice(0, rounds);
}

function hash(password, salt) {
    if (password == null || salt == null) {
        throw new Error('Must Provide Password and salt values');
    }
    if (typeof password !== 'string' || typeof salt !== 'string') {
        throw new Error('password must be a string and salt must either be a salt string or a number of rounds');
    }
    let hash = crypto.createHmac('sha512', salt);
    hash.update(password);
    let value = hash.digest('hex');
    return { salt: salt, hashedpassword: value };
}

// Pre-generated hashed passwords
const mockUsers = [
    {
        username: 'user1',
        salt: '3c15cb8fbd74',
        hashedpassword: 'b38d035c8127d22910366219eb22447e181633eb571dee73f3b01183b31cc0e1da4c565b6fe7eb122b3ab93ec539b9f250985c7442821269dfbb118e80e6f4de',
        name: 'Test User'
    },
    {
        username: 'admin',
        salt: '36ed483de1d7',
        hashedpassword: '157f260728c24914541f3a4f2484c18a0607c0e2694fc90f0ba2262723c45c2734b4420867bce7003ad49a249e122aa9642e0d731e12c14ef7d20bce24bdea86',
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