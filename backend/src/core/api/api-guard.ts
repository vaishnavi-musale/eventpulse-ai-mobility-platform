// §19.2/§26.2 — AuthN/AuthZ guard for the API layer.
// MVP: API-key (Bearer) for operator/scoped access; role-based discipline.
// Named-role + MFA is production hardening; the guard enforces the same
// contract so the API surface stays consistent.
import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IncomingHttpHeaders } from "http";
import { APP_CONFIG } from "../../config/config.module";
import { AppConfig } from "../../config/app-config.type";

export const PUBLIC_ROUTE = "eventpulse:public-route";
export const REQUIRED_ROLE = "eventpulse:required-role";

export enum OperatorRole {
  READ = "read",
  OPERATOR = "operator",
  ADMIN = "admin",
  OVERRIDE = "override",
}

/** Route metadata: mark a handler public (health, demo). */
export function PublicRoute(): MethodDecorator & ClassDecorator {
  return ((target: object, key?: PropertyKey, descriptor?: PropertyDescriptor) => {
    Reflect.defineMetadata(PUBLIC_ROUTE, true, descriptor?.value ?? target);
    return descriptor;
  }) as MethodDecorator & ClassDecorator;
}

/** Route metadata: require a specific operator role. */
export function RequireRole(role: OperatorRole): MethodDecorator {
  return (
    target: object,
    key: PropertyKey,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor => {
    Reflect.defineMetadata(REQUIRED_ROLE, role, descriptor.value);
    return descriptor;
  };
}

const ROLE_LEVEL: Record<OperatorRole, number> = {
  [OperatorRole.READ]: 1,
  [OperatorRole.OPERATOR]: 2,
  [OperatorRole.ADMIN]: 3,
  [OperatorRole.OVERRIDE]: 3,
};

@Injectable()
export class ApiGuard implements CanActivate {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.get<boolean>(
      PUBLIC_ROUTE,
      context.getHandler(),
    );
    if (isPublic) return true;

    const requiredRole = this.reflector.get<OperatorRole>(
      REQUIRED_ROLE,
      context.getHandler(),
    ) ?? OperatorRole.READ;

    const request = context.switchToHttp().getRequest<{
      headers: IncomingHttpHeaders;
    }>();
    const apiKey = this.extractBearer(request.headers);

    if (!apiKey || apiKey !== this.config.security.overrideApiKey) {
      throw new UnauthorizedException("Missing or invalid API key");
    }

    // In the MVP the single override key grants OPERATOR+; production should
    // resolve the key to a named role (role resolution is deliberately left
    // as an auth-provider seam).
    const granted = requiredRole === OperatorRole.READ
      ? OperatorRole.READ
      : OperatorRole.OPERATOR;
    if (ROLE_LEVEL[granted] < ROLE_LEVEL[requiredRole]) {
      throw new UnauthorizedException(
        `Role ${requiredRole} required but only ${granted} granted`,
      );
    }
    return true;
  }

  private extractBearer(headers: IncomingHttpHeaders): string | undefined {
    const auth = headers.authorization;
    if (!auth) return undefined;
    const [scheme, token] = auth.split(" ");
    if (scheme?.toLowerCase() !== "bearer" || !token) return undefined;
    return token;
  }
}
