import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {HomeScreen} from '@/screens/HomeScreen';
import {DetailsScreen} from '@/screens/DetailsScreen';
import {RootStackParamList} from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator(): React.JSX.Element {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerStyle: {backgroundColor: '#007AFF'},
        headerTintColor: '#fff',
        headerTitleStyle: {fontWeight: 'bold'},
      }}>
      <Stack.Screen name="Home" component={HomeScreen} options={{title: 'Calculator App'}} />
      <Stack.Screen name="Details" component={DetailsScreen} options={{title: 'Details'}} />
    </Stack.Navigator>
  );
}
