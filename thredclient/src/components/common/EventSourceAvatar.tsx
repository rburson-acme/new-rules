import React from 'react';
import { Image } from 'react-native';
import { eventTypes } from 'thredlib';
const systemAvatarImage = require('../../../assets/bot-icon.png');
const defaultAvatarImage = require('../../../assets/default-icon.png');

type EventSourceAvatarProps = {
  uri?: string;
  eventType?: string;
};
export const EventSourceAvatar = ({ uri, eventType }: EventSourceAvatarProps) => {
  const avatarImage = uri ? { uri } : eventType === eventTypes.system.type ? systemAvatarImage : defaultAvatarImage;

  return <Image source={avatarImage} style={{ width: 35, height: 35, resizeMode: 'contain' }} />;
};
