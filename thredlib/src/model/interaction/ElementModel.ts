import { ImageModel } from "./ImageModel.js";
import { InputModel } from "./InputModel.js";
import { MapModel } from "./MapModel.js";
import { TextModel } from "./TextModel.js";
import { VideoModel } from "./VideoModel.js";

export interface ElementModel {
    input?: InputModel;
    image?: ImageModel;
    text?: TextModel;
    map?: MapModel;
    video?: VideoModel;
}
  