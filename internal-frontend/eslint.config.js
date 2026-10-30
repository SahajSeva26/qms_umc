import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },

  // ── Diet mutation boundary ────────────────────────────────────────────────
  //
  // Every state-changing Diet operation goes Component → mutation hook →
  // service. The hook's mutationFn is where the RBAC check will be inserted
  // once the backend defines diet permission codes, so a component that
  // imports a write function straight from a service would silently sit
  // outside that check.
  //
  // This bans exactly those write functions from Diet components/pages — by
  // NAME, not by module — so the many legitimate synchronous READ imports
  // (dietitianDetails, poCampCost, campPaymentStatus, clientName, …) keep
  // working. It is a review aid, not a security control: real enforcement is
  // the backend's AuthorizeMiddleware. What it does guarantee is that the
  // frontend cannot grow a second, uncontrolled path to the same write.
  {
    files: ['src/features/diet/{components,pages}/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [
          {
            // The Diet-Camps service at the feature root. Both its writes AND
            // its Partial<Camp> patch builders are listed: the builders write
            // nothing themselves, but assembling a patch in a component and
            // pushing it through useCampsData's patchCamp is exactly the
            // bypass the mutation hooks exist to close. `getData` and the
            // DietOwnData type stay importable — they are reads.
            name: '@/features/diet/diet.service',
            importNames: [
              'upsertDietitianProfile', 'sendAllReminders', 'addMedia', 'addAssessment',
              'bookTeleConsult', 'setTeleConsultStatus', 'recordConfirmationInReminderLog',
              'setPatientCountPatch', 'markLivePatch', 'cancelCampPatch', 'closeCampPatch',
              'assignTeamPatch', 'setConfirmationPatch',
            ],
            message: 'Diet Camps writes go through useDietCamps() — its mutation objects (diet.markLive, diet.closeCamp, diet.addMedia, …) are where cache invalidation and the future RBAC check live.',
          },
          {
            name: '@/features/diet/services/dietitianRoster.service',
            importNames: [
              'addDietitianEnrollment', 'updateDietitianDetails', 'addDietitianBank',
              'setDietitianResume', 'setDietitianDeviceAlignment',
              'submitDietitianForInterview', 'omInterviewDecision',
            ],
            message: 'Roster writes go through the hooks in hooks/useDietitianRoster.ts (useEnrollDietitian, useUpdateDietitianDetails, useAddDietitianBank, …) — that is where the RBAC check and cache invalidation live.',
          },
          {
            name: '@/features/diet/services/dietitianEquipment.service',
            importNames: ['requestBcaScale', 'verifyBcaScale', 'logStockMovement'],
            message: 'Equipment writes go through hooks/useDietitianEquipment.ts (useRequestBcaScale, useVerifyBcaScale, useLogStockMovement).',
          },
          {
            name: '@/features/diet/services/dietitianRates.service',
            importNames: ['recordDietitianRates'],
            message: 'Recording rates is part of the assignment action — use useAssignDietitianWithRates() from hooks/useDietitianRates.ts, which writes the camp patch and the rate history together.',
          },
          {
            name: '@/features/diet/services/dietCampWorkflow.service',
            importNames: ['assignDietitianByCoordPatch', 'reopenRequestDecisionPatch', 'approveTokenReopenPatch'],
            message: 'Camp-workflow patches are applied by their mutation hooks (useAssignDietitianWithRates, useDecideReopenRequest) — building the patch in a component reopens the bypass they exist to close.',
          },
          {
            name: '@/features/diet/services/dietitianInvite.service',
            importNames: ['addCampInvites', 'recordInviteResponse'],
            message: 'Invite writes go through hooks/useDietitianInvites.ts (useAddCampInvites, useRecordInviteResponse).',
          },
          {
            name: '@/features/diet/services/dietitianPayment.service',
            importNames: ['addDietPayment'],
            message: 'Recording a payout goes through useAddDietPayment() from hooks/useDietitianPayments.ts. The CSV-import and reconciliation loops on DietitianPaymentPage are the one documented exception (one invalidation for the whole batch, not one per row) and disable this rule explicitly.',
          },
        ],
      }],
    },
  },
])
