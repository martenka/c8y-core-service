import { Role } from '../global/types/roles.';
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export const UserRoute = () => Roles(Role.User);
export const AdminRoute = () => Roles(Role.Admin);
export const AllRoute = () => Roles(Role.Admin, Role.User);
