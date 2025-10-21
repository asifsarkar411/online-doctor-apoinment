import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- 1. Firebase Setup ---
// These global-like variables are expected to be injected by the environment 
// in which this code is run (e.g., a specific collaborative coding platform).
// For standalone testing, you'll need to define real Firebase credentials here.
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

let db = null;
let auth = null;
let userId = null;

// Function to safely initialize Firebase
const initFirebase = async () => {
    try {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);

        if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
        } else {
            await signInAnonymously(auth);
        }
        
        // Use authenticated UID or a random ID if authentication fails
        userId = auth.currentUser?.uid || crypto.randomUUID();
        console.log("Firebase initialized. User ID:", userId);

    } catch (error) {
        console.error("Error initializing Firebase or authenticating:", error);
    }
};

// Exposed function to save data
const saveAppointment = async (data) => {
    if (!db || !userId) {
        console.error("Database not ready or User ID missing.");
        return { success: false, message: "System not ready. Please try again." };
    }
    
    try {
        // Private data path for the current user: /artifacts/{appId}/users/{userId}/appointments
        const path = `artifacts/${appId}/users/${userId}/appointments`;
        
        const docRef = await addDoc(collection(db, path), {
            ...data,
            timestamp: new Date().toISOString(),
            status: 'Pending'
        });

        console.log("Appointment saved to Firestore with ID:", docRef.id);
        return { success: true, message: "Appointment confirmed and saved successfully!" };

    } catch (error) {
        console.error("Error saving appointment:", error);
        return { success: false, message: "An error occurred while confirming the appointment." };
    }
};


// --- 2. Utility Functions ---

/**
 * Creates a toast notification (a success or error message).
 * @param {string} message - The message to display.
 * @param {string} type - 'success' or 'error'.
 */
function showToast(message, type) {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;

    // Define icon based on type
    let icon, alertClass;
    if (type === 'success') {
        icon = '<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>';
        alertClass = 'alert-success';
    } else {
        icon = '<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>';
        alertClass = 'alert-error';
    }

    // Create the toast HTML element
    const toast = document.createElement('div');
    toast.className = `alert ${alertClass} shadow-lg`;
    toast.innerHTML = `${icon}<span>${message}</span>`;
    
    // Append to container
    toastContainer.appendChild(toast);

    // Remove after 5 seconds
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

// --- 3. Main Application Logic (DOM and Event Listeners) ---

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize lucide icons
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
    }
    
    // Assign elements
    const form = document.getElementById('appointmentForm');
    const userIdDisplay = document.getElementById('userIdDisplay');
    const newPatientBtn = document.getElementById('newPatientBtn');
    const registeredPatientBtn = document.getElementById('registeredPatientBtn');
    const patientDetailsSection = document.getElementById('patientDetailsSection');

    // Initialize Firebase first
    await initFirebase();
    userIdDisplay.textContent = userId;

    // --- Form Interaction Logic ---

    // Toggle between New Patient and Registered Patient UI
    newPatientBtn.addEventListener('click', () => {
        newPatientBtn.classList.add('btn-active', 'text-primary');
        registeredPatientBtn.classList.remove('btn-active', 'text-primary');
        registeredPatientBtn.classList.add('text-gray-500');
        patientDetailsSection.classList.remove('hidden'); // Show details for new patient
    });

    registeredPatientBtn.addEventListener('click', () => {
        registeredPatientBtn.classList.add('btn-active', 'text-primary');
        newPatientBtn.classList.remove('btn-active', 'text-primary');
        newPatientBtn.classList.add('text-gray-500');
        patientDetailsSection.classList.add('hidden'); 
        showToast('Please login or enter details to search for existing profile.', 'error');
    });

    // --- Form Submission Handler ---
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Collect form data
            const formData = {
                branch: document.getElementById('branch').value,
                speciality: document.getElementById('speciality').value,
                doctor: document.getElementById('doctor').value,
                notes: document.getElementById('notes').value,
                patientDetails: {
                    name: document.getElementById('name').value,
                    phone: document.getElementById('phone').value,
                    age: document.getElementById('age').value,
                    gender: document.getElementById('gender').value,
                },
                termsAgreed: document.getElementById('terms').checked,
                appointmentDate: "October 22, 2025"
            };

            // Basic Client-side validation
            if (!formData.branch || !formData.speciality || !formData.doctor || !formData.patientDetails.name || !formData.termsAgreed) {
                showToast('Please fill out all required fields and agree to the terms.', 'error');
                return;
            }

            // Call the save function
            const result = await saveAppointment(formData);
            
            if (result.success) {
                showToast(result.message, 'success');
                form.reset(); 
                // Re-initialize user ID display after reset, in case it was cleared
                if (userIdDisplay) userIdDisplay.textContent = userId;
            } else {
                showToast(result.message, 'error');
            }
        });
    }
});