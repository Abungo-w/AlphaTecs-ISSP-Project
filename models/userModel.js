const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const userModel = {
    findOne: async (email) => {
        return await prisma.user.findUnique({
            where: {
                email: email
            }
        });
    },
    
    findById: async (id) => {
        return await prisma.user.findUnique({
            where: {
                id: id
            }
        });
    }
};

module.exports = { userModel };
