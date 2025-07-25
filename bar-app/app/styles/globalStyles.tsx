import { StyleSheet } from 'react-native';

export const globalStyles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#fff', flexGrow: 1 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  subtitle: { fontSize: 18, fontWeight: '600', marginTop: 24 },
  input: {
    borderWidth: 1,
    padding: 12,
    borderRadius: 6,
    marginBottom: 10,
    borderColor: '#ddd',
  },
  roles: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    justifyContent: 'space-around',
  },
  user: {
    borderBottomWidth: 1,
    borderColor: '#eee',
    paddingVertical: 10,
  },
  email: {
    fontSize: 12,
    color: '#777',
  },
});
