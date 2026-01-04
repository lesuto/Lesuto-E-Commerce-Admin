import { PermissionDefinition } from '@vendure/core';

export const manageProductAssignmentsPermission = new PermissionDefinition({
    name: 'ManageProductAssignments',
    description: 'Allows removing products from merchant channel',
});