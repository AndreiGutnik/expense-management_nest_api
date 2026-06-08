import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator'

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    )

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true
    }

    const request = context.switchToHttp().getRequest()
    const user = request.user

    if (!user || !user.role) {
      throw new ForbiddenException('No role assigned')
    }

    const userPermissions = user.role.permissions || []
    const userPermissionStrings = userPermissions.map(
      p => `${p.resource}:${p.action}`,
    )

    const hasPermission = requiredPermissions.some(permission =>
      userPermissionStrings.includes(permission),
    )

    if (!hasPermission) {
      throw new ForbiddenException(
        'You do not have permission to access this resource',
      )
    }

    return true
  }
}
