export interface BoardTemplateOption {
  key: string;
  label: string;
}

/** Debe mantenerse sincronizado con collabforge-api/src/boards/templates.ts */
export const BOARD_TEMPLATE_OPTIONS: BoardTemplateOption[] = [
  { key: 'START_STOP_CONTINUE', label: 'Start / Stop / Continue' },
  { key: 'MAD_SAD_GLAD', label: 'Mad / Sad / Glad' },
  { key: 'FOUR_L', label: '4L (Liked / Learned / Lacked / Longed for)' },
  { key: 'BLANK', label: 'En blanco' },
];
