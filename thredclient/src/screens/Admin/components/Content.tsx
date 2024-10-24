import React from 'react';
import { Template } from '../template/Template';
import { RootStore } from '@/src/stores/rootStore';
import { ThredsStore } from '@/src/stores/ThredsStore';

type ContentProps = {
  stores: {
    rootStore: RootStore;
    thredsStore: ThredsStore;
  };
};
export const Content = ({ stores }: ContentProps) => {
  return <Template stores={stores} />;
};
