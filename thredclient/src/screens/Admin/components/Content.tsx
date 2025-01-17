import React from 'react';
import { RootStore } from '@/src/stores/rootStore';
import { ThredsStore } from '@/src/stores/ThredsStore';
import { Template } from '@/src/components/template/Template';

type ContentProps = {
  stores: {
    rootStore: RootStore;
    thredsStore: ThredsStore;
  };
};
export const Content = ({ stores }: ContentProps) => {
  return <Template stores={stores} />;
};
