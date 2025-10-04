'use client';

import { memo } from 'react';

import type { CoupleMembership, CoupleSummary, Profile } from '../../lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { THEME_LABELS } from '../../lib/theme';

/**
 * Icono inline compatible con SSR/test sin depender de librerías externas.
 */
function UsersGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

interface CoupleMembersListProps {
  currentUserId: string;
  members: Profile[];
  memberships: CoupleMembership[];
  activeCouple: CoupleSummary | null;
}

const STATUS_LABELS: Record<CoupleMembership['status'], string> = {
  accepted: 'Activa',
  pending: 'Pendiente',
  declined: 'Rechazada',
};

/**
 * Sección reutilizable que lista las parejas del usuario y sus miembros activos.
 * Mantener comentarios claros facilita el onboarding de otros devs.
 */
function CoupleMembersListComponent({
  currentUserId,
  members,
  memberships,
  activeCouple,
}: CoupleMembersListProps) {
  const acceptedMembers = activeCouple
    ? members.filter((member) => member.coupleId === activeCouple.id)
    : [];

  const otherMemberships = memberships.filter((membership) => membership.coupleId !== activeCouple?.id);

  return (
    <Card className="h-full rounded-3xl border border-border/40 bg-card/80 shadow-lg shadow-primary/5 backdrop-blur">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Mis parejas</CardTitle>
          <CardDescription>
            Visualiza quién comparte tu cuenta y el estado de cada vínculo.
          </CardDescription>
        </div>
        <UsersGlyph className="h-5 w-5 text-primary" />
      </CardHeader>
      <CardContent className="space-y-6">
        {activeCouple ? (
          <section aria-label="Pareja activa" className="space-y-3">
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pareja activa</p>
                <p className="text-lg font-headline text-foreground">
                  {activeCouple.name ?? 'Nuestra pareja'}
                </p>
              </div>
              {activeCouple.inviteCode ? (
                <Badge variant="outline" className="rounded-full border-primary/40 bg-primary/10 text-primary">
                  Código: {activeCouple.inviteCode}
                </Badge>
              ) : null}
            </div>

            {acceptedMembers.length > 0 ? (
              <ul className="space-y-3" aria-label="Integrantes de la pareja activa">
                {acceptedMembers.map((member) => {
                  const isCurrentUser = member.id === currentUserId;
                  return (
                    <li
                      key={member.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-border/50 bg-muted/40 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-11 w-11">
                          <AvatarImage src={member.avatarUrl ?? undefined} alt={member.displayName} />
                          <AvatarFallback>{member.displayName.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-semibold">{member.displayName}</p>
                          <p className="text-xs text-muted-foreground">
                            {member.theme ? `Tema ${THEME_LABELS[member.theme]}` : 'Sin tema definido'}
                          </p>
                        </div>
                      </div>
                      <Badge variant={isCurrentUser ? 'default' : 'secondary'} className="rounded-full px-3 py-1 text-xs">
                        {isCurrentUser ? 'Tú' : 'Miembro'}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Aún no tienes miembros aceptados dentro de la pareja actual.
              </p>
            )}
          </section>
        ) : (
          <p className="text-sm text-muted-foreground">
            Todavía no tienes una pareja aceptada. Usa la pestaña de configuración para crear o unirte a una.
          </p>
        )}

        {otherMemberships.length > 0 ? (
          <section aria-label="Otros vínculos" className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Otros estados</p>
            <ul className="space-y-2">
              {otherMemberships.map((membership) => (
                <li
                  key={`${membership.coupleId}-${membership.status}`}
                  className="flex items-center justify-between rounded-2xl border border-dashed border-border/60 bg-background/60 p-3 text-sm"
                >
                  <span className="font-medium">ID: {membership.coupleId}</span>
                  <Badge variant="outline" className="rounded-full px-3 py-1 text-xs uppercase tracking-wide">
                    {STATUS_LABELS[membership.status]}
                  </Badge>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}

export const CoupleMembersList = memo(CoupleMembersListComponent);

CoupleMembersList.displayName = 'CoupleMembersList';

