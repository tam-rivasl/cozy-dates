import test from 'node:test';
import assert from 'node:assert/strict';

import { passwordSchema, profileSchema } from '../profile-schema';

test('profileSchema normaliza campos opcionales y edad', () => {
  const parsed = profileSchema.parse({
    displayName: '  Alex  ',
    firstName: ' Alex ',
    lastName: '  Rivera',
    nickname: ' Lex ',
    age: '32',
    contactEmail: '  alex@example.com ',
    theme: 'default',
  });

  assert.equal(parsed.displayName, 'Alex');
  assert.equal(parsed.firstName, 'Alex');
  assert.equal(parsed.lastName, 'Rivera');
  assert.equal(parsed.nickname, 'Lex');
  assert.equal(parsed.age, 32);
  assert.equal(parsed.contactEmail, 'alex@example.com');
  assert.equal(parsed.theme, 'default');
});

test('profileSchema permite campos opcionales vacíos', () => {
  const parsed = profileSchema.parse({
    displayName: 'Alex',
    firstName: '',
    lastName: '',
    nickname: '',
    age: '',
    contactEmail: 'alex@example.com',
    theme: 'terracota',
  });

  assert.equal(parsed.firstName, null);
  assert.equal(parsed.lastName, null);
  assert.equal(parsed.nickname, null);
  assert.equal(parsed.age, null);
});

test('profileSchema rechaza edad inválida', () => {
  assert.throws(() =>
    profileSchema.parse({
      displayName: 'Alex',
      firstName: '',
      lastName: '',
      nickname: '',
      age: 'abc',
      contactEmail: 'alex@example.com',
      theme: 'terracota',
    }),
  );
});

test('passwordSchema valida coincidencia y longitud', () => {
  const valid = passwordSchema.parse({
    currentPassword: 'contraseña-actual',
    newPassword: 'contraseña-nueva-123',
    confirmPassword: 'contraseña-nueva-123',
  });
  assert.equal(valid.newPassword, 'contraseña-nueva-123');

  assert.throws(() =>
    passwordSchema.parse({
      currentPassword: 'actual',
      newPassword: 'short',
      confirmPassword: 'different',
    }),
  );
});
