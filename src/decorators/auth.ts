import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_ROUTE = 'PUBLIC_ROUTE';
export const IsPublicRoute = () => SetMetadata(IS_PUBLIC_ROUTE, true);
