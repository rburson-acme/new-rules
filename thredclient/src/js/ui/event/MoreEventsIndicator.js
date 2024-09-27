
import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import PropTypes from 'prop-types'
import { observer } from 'mobx-react-lite';
import Icon from '../lib/Icon';

export const MoreEventsIndicator = observer(({ eventsStore, onPress }) => {
    const { unseenEvents } = eventsStore;
    return unseenEvents ?
        (
            <TouchableOpacity style={style} onPress={onPress}>
                <Text style={textStyle}>{unseenEvents}</Text>
                <Icon
                    name='chevron-down'
                    style={iconStyle}
                />
            </TouchableOpacity>
        )
         : null;
});

MoreEventsIndicator.propTypes = {
    eventsStore: PropTypes.object,
    onPress: PropTypes.func
}

const style = {
    flexDirection: 'column',
    alignItems: 'center',
    position: 'absolute',
    width: 50,
    height: 50,
    left: '50%',
    marginLeft: -25,
    bottom: 15,
    borderRadius: 50,
    backgroundColor: 'rgba(50, 50, 50, .4)'
}

const textStyle = {
    marginTop: 5,
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold'
}

const iconStyle = {
    color: '#fff',
    fontSize: 15,
}

