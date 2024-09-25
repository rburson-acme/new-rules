import { Transition } from './Transition.js';

export interface State<S,T> {

    name: string;
    transition: Transition<S,T>;

}