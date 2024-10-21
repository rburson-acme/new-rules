import { ElementModel } from './ElementModel.js';

export enum TextType {
  header1 = 'header1',
  header2 = 'header2',
  header3 = 'header3',
  header4 = 'header4',
  header5 = 'header5',
  normal = 'normal',
  sub1 = 'sub1',
}

export interface TextModel extends ElementModel {
  text: string;
  type: string;
}
