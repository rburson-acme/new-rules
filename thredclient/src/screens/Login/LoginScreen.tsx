import React from 'react';
import { View, TextInput, Text, Image, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import { AdminScreen } from '../Admin/AdminScreen';
import { MessengerLayout } from '../Messenger/MessengerLayout';
import { Button } from '@/src/components/Button';
import rootStore from '@/src/stores/rootStore';

const logo = require('../../../assets/workthreds_logo.png');

export const Layout = observer(() => {
  const { authStore, routeStore, thredsStore } = rootStore;
  const { currentRoute } = routeStore;
  const handleMessengerView = () => {
    console.log({ userId: authStore.userId });
    if (!authStore.userId) return;
    thredsStore.connect(authStore.userId);
    routeStore.setCurrentRoute({
      component: MessengerLayout,
      props: { rootStore },
    });
  };
  const handleAdminView = () => {
    if (!authStore.userId) return;
    thredsStore.connect(authStore.userId);
    routeStore.setCurrentRoute({
      component: AdminScreen,
      props: { rootStore },
    });
  };
  return (
    currentRoute || (
      <View style={styles.container}>
        <Image source={logo} style={styles.logoStyle} />
        <View style={styles.fieldContainer}>
          <Text style={styles.textLabelStyle}>userId: </Text>
          <TextInput
            style={styles.textInputStyle}
            value={authStore.userId || ''}
            onChangeText={text => authStore.setUserId(text)}
          />
        </View>
        <View style={styles.fieldContainer}>
          <Text style={styles.textLabelStyle}>password: </Text>
          <TextInput secureTextEntry={true} style={styles.textInputStyle} defaultValue="" />
        </View>
        <Button
          content="Messenger View"
          textStyle={styles.buttonTextStyle}
          buttonStyle={{ ...styles.buttonStyle, marginTop: 30 }}
          onPress={handleMessengerView}
        />
        <Button
          content="Admin View"
          textStyle={styles.buttonTextStyle}
          buttonStyle={styles.buttonStyle}
          onPress={handleAdminView}
        />
      </View>
    )
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    flexGrow: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: 5,
  },
  fieldContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  textLabelStyle: {
    width: 100,
    textAlign: 'right',
    marginRight: 10,
  },
  textInputStyle: {
    backgroundColor: '#eee',
    width: 200,
    height: 40,
  },
  buttonTextStyle: {
    color: '#fff',
  },
  buttonStyle: {
    marginTop: 20,
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 12,
    paddingRight: 12,
    width: 200,
    backgroundColor: '#4DB9CC',
  },
  logoStyle: {
    width: '50%',
    resizeMode: 'contain',
    margin: 0,
    padding: 0,
  },
});