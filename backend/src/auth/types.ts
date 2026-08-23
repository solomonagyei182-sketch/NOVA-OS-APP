import { Role } from '@prisma/client';

export type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  sessionId: string;
};
