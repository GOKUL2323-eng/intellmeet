import mongoose, { Schema, Document } from 'mongoose';
import { UserRole } from '@intellmeet/shared';

export interface IUserDocument extends Document {
  email: string;
  passwordHash?: string;
  fullName: string;
  avatarUrl?: string;
  role: UserRole;
  timezone: string;
  googleId?: string;
  authProvider: 'local' | 'google' | 'both';
  googleTokens?: {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
    scope?: string;
  };
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    passwordHash: {
      type: String,
      required: false,
      default: ''
    },
    fullName: {
      type: String,
      required: true,
      trim: true
    },
    avatarUrl: {
      type: String,
      default: ''
    },
    googleId: {
      type: String,
      sparse: true,
      index: true
    },
    authProvider: {
      type: String,
      enum: ['local', 'google', 'both'],
      default: 'local'
    },
    googleTokens: {
      accessToken: { type: String },
      refreshToken: { type: String },
      expiresAt: { type: Date },
      scope: { type: String }
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.MEMBER
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    passwordResetToken: {
      type: String,
      default: null
    },
    passwordResetExpires: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret._id?.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash;
        delete ret.googleTokens;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpires;
        return ret;
      }
    }
  }
);

export const UserModel = mongoose.model<IUserDocument>('User', UserSchema);
