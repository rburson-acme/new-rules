import { Threds } from '../Threds';
export const systemBindings = ({ threds }: { threds: Threds }) => {
  const terminateThred = (thredId: string) => {
    
    // !!! make sure you can't kill the current thred !!!

    threds.terminateThred(thredId);

  };

  return {
    terminateThred,
  };
};
