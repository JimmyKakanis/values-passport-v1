import { db } from '../firebaseConfig';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  doc, 
  updateDoc,
  setDoc
} from 'firebase/firestore';

// We keep students hardcoded for now as the "Directory", 
