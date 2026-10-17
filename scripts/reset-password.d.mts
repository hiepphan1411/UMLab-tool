import type { Db } from 'mongodb';

export function passwordProblem(pw: string): string | null;
export function tempPassword(): string;
export function hashPassword(password: string): Promise<string>;
export function resetPassword(db: Db, email: string, password: string): Promise<boolean>;
