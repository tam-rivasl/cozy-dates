import { renderToStaticMarkup } from 'react-dom/server';
import test from 'node:test';
import assert from 'node:assert/strict';

import { CoupleMembersList } from '../couple-members-list';
import type { CoupleMembership, CoupleSummary, Profile } from '../../../lib/types';

const currentUser: Profile = {
  id: 'user-1',
  displayName: 'Alex',
  avatarUrl: null,
  theme: 'blossom',
  coupleId: 'couple-1',
  confirmedAt: '2024-01-01T00:00:00Z',
};

const partner: Profile = {
  id: 'user-2',
  displayName: 'Sam',
  avatarUrl: null,
  theme: 'dark',
  coupleId: 'couple-1',
  confirmedAt: '2024-01-01T00:00:00Z',
};

const pendingMembership: CoupleMembership = {
  coupleId: 'couple-2',
  status: 'pending',
  role: 'member',
};

const summary: CoupleSummary = {
  id: 'couple-1',
  name: 'Team Cozy',
  inviteCode: 'ABCD1234',
};

test('CoupleMembersList renders members and highlights the current user', () => {
  const html = renderToStaticMarkup(
    <CoupleMembersList
      currentUserId={currentUser.id}
      members={[currentUser, partner]}
      memberships={[pendingMembership]}
      activeCouple={summary}
    />,
  );

  assert.ok(html.includes('Team Cozy'));
  assert.ok(html.includes('Alex'));
  assert.ok(html.includes('Sam'));
  assert.ok(html.includes('Tema Blossom'));
  assert.ok(html.includes('Tema Dark'));
  assert.ok(html.includes('Tú'));
  assert.ok(html.includes('Pendiente'));
});

test('CoupleMembersList shows helper text when there is no active couple', () => {
  const html = renderToStaticMarkup(
    <CoupleMembersList
      currentUserId={currentUser.id}
      members={[{ ...currentUser, coupleId: null }]}
      memberships={[]}
      activeCouple={null}
    />,
  );

  assert.ok(html.includes('Todavía no tienes una pareja aceptada'));
});
