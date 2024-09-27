import React from 'react';
import { Image } from 'react-native';
import PropTypes from 'prop-types';
import { eventTypes } from "thredlib";

const systemAvatarImage = require('../../../../assets/bot-icon.png');
const defaultAvatarImage = require('../../../../assets/default-icon.png');

export const EventSourceAvatar = ({ uri, eventType }) => {

    const avatarImage = (uri ? { uri } :
        (eventType === eventTypes.system.type) ? systemAvatarImage :
            defaultAvatarImage);

    return (
        <Image
            source={avatarImage}
            style={{ width: 35, height: 35, resizeMode: 'contain' }}
        />
    )
}
EventSourceAvatar.propTypes = {
    uri: PropTypes.string,
    eventType: PropTypes.string,
} 