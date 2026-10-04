import { Text, View } from 'react-native';

export default function Index() {
  return (
    <View
      style={{
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <Text style={{ fontSize: 20, fontWeight: '600' }}>Daywell</Text>
      <Text style={{ marginTop: 8, textAlign: 'center' }}>Mobile foundation in progress.</Text>
    </View>
  );
}
