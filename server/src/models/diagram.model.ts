import { Document, Schema, model } from 'mongoose';
import { z } from 'zod';

const diagramSchema = z.object({
  name: z.string(),
  userId: z.string(),
  isPublic: z.boolean(),
  collaborators: z
    .array(
      z.object({
        userId: z.any(),
        role: z.enum(['editor', 'viewer']),
        addedAt: z.date().optional(),
      })
    )
    .optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

type Diagram = z.infer<typeof diagramSchema> & Document;

const schema = new Schema<Diagram>(
  {
    name: { type: String, required: true, default: 'Untitled Diagram' },
    userId: { type: String, ref: 'User', required: true },
    isPublic: {
      type: Boolean,
      required: true,
      default: false,
    },
    collaborators: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        role: { type: String, enum: ['editor', 'viewer'], default: 'editor' },
        addedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

const DiagramModel = model<Diagram>('Diagram', schema);

export { Diagram, DiagramModel, diagramSchema };
