// The attendease theme. `astryx experimental theme editor` wrote this file once and never changes it again.
// The checked settings live in attendease.settings.json and the generated attendease.settings.ts;
// change them with `astryx experimental theme editor set attendease ...`. Add your own changes below: they win over the settings.
import {defineTheme} from '@astryxdesign/core/theme';
import {attendeaseSettings} from './attendease.settings';

export const attendeaseTheme = defineTheme({
  extends: attendeaseSettings,
  name: 'attendease',
});
