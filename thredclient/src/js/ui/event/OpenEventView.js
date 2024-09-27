import React from 'react';
import { View } from 'react-native';
import PropTypes from 'prop-types';
import { EventDataView } from './EventDataView';
import { OpenEventHeader } from './OpenEventHeader';
import { EventAttachmentView } from './EventAttachment';
import { Button } from '../lib/Button';
import { Bar } from '../lib/Bar';

export const OpenEventView = ({ stores, event }) => {
    const { data, time } = event;
    const { thredsStore } = stores;
    return (
        <View style={containerStyle}>
            <Bar />
            <View style={contentStyle}>
                <OpenEventHeader event={event} />
                <EventDataView data={event.data} time={time} containerStyle={eventDataStyle} stores={stores}/>
                <Button content='Back To Thred' buttonStyle={buttonStyle} onPress={() => { thredsStore.closeOpenEventStore() }} />
            </View>
        </View>
    )
}

OpenEventView.propTypes = {
    event: PropTypes.object,
    stores: PropTypes.shape({
        rootStore: PropTypes.object,
        thredsStore: PropTypes.object,
    })
}

const containerStyle = {
    flexDirection: 'column',
    alignItems: 'stretch',
    flexGrow: 1,
    backgroundColor: '#f3f3f3',
    marginTop: 25,
    marginBottom: 20,
    paddingRight: 15,
    paddingLeft: 16,
    paddingBottom: 20,
}
const contentStyle = {
    flexDirection: 'column',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 1,
    paddingTop: 10,
    paddingRight: 5,
    paddingBottom: 20,
    paddingLeft:5 
}
const eventDataStyle = {
    marginTop: 15,
}
const buttonStyle = {
    marginTop: 40
}
