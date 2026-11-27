import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends mongoose.Document {
    email: string;
    password: string;
    displayName: string;
    bio?: string;
    location?: string;
    avatarUrl?: string;
    level: number;
    xp: number;
    streak: number;
    joinDate: Date;
    createdAt?: Date;
    updatedAt?: Date;
    languages: string[];
    currentLanguage: string;
    companionConversation?: Partial<Record<'spanish' | 'japanese', mongoose.Types.ObjectId>>;
    comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6,
        select: false
    },
    displayName: {
        type: String,
        required: true,
        trim: true
    },
    bio: {
        type: String,
        maxlength: 500,
        default: '',
        trim: true
    },
    location: {
        type: String,
        default: '',
        trim: true
    },
    avatarUrl: {
        type: String,
        default: '/avatars/default.jpg'
    },
    level: {
        type: Number,
        default: 1
    },
    xp: {
        type: Number,
        default: 0
    },
    streak: {
        type: Number,
        default: 0
    },
    joinDate: {
        type: Date,
        default: Date.now
    },
    languages: {
        type: [String],
        default: []
    },
    companionConversation: {
        spanish: mongoose.Schema.Types.ObjectId,
        japanese: mongoose.Schema.Types.ObjectId
    },
    currentLanguage: {
        type: String,
        enum: ['spanish', 'japanese'],
        default: 'japanese'
    }
}, { 
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error: any) {
        next(error);
    }
});

// Method to compare password for login
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        return false;
    }
};

const User = mongoose.model<IUser>('User', userSchema);

export default User;
