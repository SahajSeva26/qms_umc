import { useMutation } from '@tanstack/react-query'
import { quickSwitchService } from './quickSwitch.service'

export const useQuickSwitch = () => useMutation({
  mutationFn: quickSwitchService.login,
})
