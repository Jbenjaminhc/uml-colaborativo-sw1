import { Document, Schema, model } from 'mongoose';
import { z } from 'zod';

const userSchema = z.object({
  username: z.string().min(3).max(20),
  email: z.string().email(),
  password: z.string().min(8),
  verified: z.boolean().default(false),
  role: z.enum(['user', 'admin']).default('user'),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

type User = z.infer<typeof userSchema> & Document;

const schema = new Schema<User>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      minlength: 3,
      maxlength: 20,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: { type: String, required: true },
    verified: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
  },
  { timestamps: true }
);

const UserModel = model<User>('User', schema);

export { User, UserModel, userSchema };
