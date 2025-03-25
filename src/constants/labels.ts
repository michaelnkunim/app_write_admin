/**
 * Application labels organized by component or page
 * This structure supports easy translation and customization
 */

export const LABELS = {
  // Edit Listing Page
  editListingPage: {
    CREATE_LISTING: 'Create New Listing',
    EDIT_LISTING: 'Edit Listing',
    DELETE_DRAFT: 'Delete Draft',
    LISTINGS: 'Listings',
    ADD_NEW_LISTING: 'Add New Listing',
    CANCEL: 'Cancel',
    SAVE_LISTING: 'Save Listing',
    UPDATE_LISTING: 'Update Listing',
    SAVING: 'Saving...',
    DRAFT_DELETED: 'Draft deleted successfully',
    CREATED_SUCCESS: 'Listing created successfully!',
    UPDATED_SUCCESS: 'Listing updated successfully!',
    
    // Form labels
    CATEGORY: 'Category',
    TITLE: 'Title',
    TITLE_PLACEHOLDER: 'Enter listing title',
    DESCRIPTION: 'Description',
    DESCRIPTION_PLACEHOLDER: 'Describe your property',
    LOCATION: 'Location',
    LOCATION_PLACEHOLDER: 'Enter location',
    PRICE: 'Price',
    PRICE_PER_MONTH: 'Price per month',
    PRICE_PER_NIGHT: 'Price per night',
    PRICE_PLACEHOLDER: 'Enter price',
    
    // Property details
    PROPERTY_TYPE: 'Property Type',
    BEDROOMS: 'Bedrooms',
    BATHROOMS: 'Bathrooms',
    AREA: 'Area (m²)',
    AMENITIES: 'Amenities',
    SELECTED: 'selected',
    ADD_CUSTOM_AMENITY: 'Add custom amenity',
    ADD: 'Add',
    SHOW_LESS: 'Show less',
    SHOW_MORE: 'Show more',
    
    // Promotion package
    PROMOTION_PACKAGE: 'Promotion Package',
    YOUR_BALANCE: 'Your Balance',
    ACTIVE_PROMOTION: 'Active promotion package',
    FEATURED_FOR: 'Featured for',
    DAYS: 'days',
    INSUFFICIENT_BALANCE: 'Insufficient balance. You need ₵',
    ADD_FUNDS: 'Add Funds',
    NEEDED: 'needed',
    
    // Images
    IMAGES: 'Images',
    UPLOADING: 'Uploading...',
    DROP_IMAGES: 'Drop images here',
    DRAG_IMAGES: 'Drag images here or click to upload',
    MAX_IMAGES: 'Maximum 6 images allowed',
    
    // Validation errors
    REQUIRED_TITLE: 'Title is required',
    REQUIRED_DESCRIPTION: 'Description is required',
    REQUIRED_LOCATION: 'Location is required',
    PRICE_GREATER: 'Price must be greater than 0',
    REQUIRED_IMAGE: 'At least one image is required',
    REQUIRED_AMENITY: 'Select at least one amenity',
    REQUIRED_PROPERTY_TYPE: 'Property type is required',
    REQUIRED_PACKAGE: 'Please select a promotion package',
    INSUFFICIENT_BALANCE_PACKAGE: 'Insufficient balance for the selected promotion package',
    
    // Modal
    LISTING_CREATED: 'Listing Created Successfully!',
    LISTING_UPDATED: 'Listing Updated Successfully!',
    VIEW_MY_LISTINGS: 'View My Listings'
  },
  
  // AgentProfileCard Component
  agentProfileCardComponent: {
    SHOW_NUMBER: 'Show Number',
    MESSAGE: 'Message',
    VERIFIED_ACCOUNT: 'Verified Account',
    YOUR_RATING: 'Your Rating',
    RATE_AGENT: 'Rate Agent'
  },
  
  // Home Page
  homePage: {
    FEATURED_PROPERTIES: 'Featured Properties',
    VIEW_ALL: 'View All',
    POPULAR_LISTINGS: 'Popular Listings',
    NEW_LISTINGS: 'New Listings',
    SEARCH_PLACEHOLDER: 'Search for properties...',
    NO_PROPERTIES: 'No properties available for this category.'
  },
  
  // Shared Components
  shared: {
    LOADING: 'Loading...',
    ERROR: 'An error occurred',
    RETRY: 'Retry',
    SUBMIT: 'Submit',
    SAVE: 'Save',
    CANCEL: 'Cancel',
    DELETE: 'Delete',
    EDIT: 'Edit',
    VIEW: 'View',
    CLOSE: 'Close',
    CONFIRM: 'Confirm',
    YES: 'Yes',
    NO: 'No',
    CHANGE_LANGUAGE: 'Change Language',
    ACTIVE: 'Active',
    // Navigation labels
    HOME: 'Home',
    FAVORITES: 'Favorites',
    MESSAGE: 'Message',
    SEARCH: 'Search',
    ADD: 'Add',
    PROFILE: 'Profile',
    LANGUAGE: 'Language',
    // Search related
    RECENT_SEARCHES: 'Recent searches',
    NO_RESULTS: 'No results found',
    SEARCH_RESULTS: 'Search results'
  },
  
  // Authentication related
  auth: {
    LOGIN: 'Log in or sign up',
    WELCOME: 'Welcome to RentEasy',
    EMAIL: 'Email',
    CONTINUE_WITH_EMAIL: 'Continue with email',
    CONTINUE_WITH_GOOGLE: 'Continue with Google',
    CONTINUE_WITH_FACEBOOK: 'Continue with Facebook',
    CONTINUE_WITH_APPLE: 'Continue with Apple',
    OR: 'or',
    FORGOT_PASSWORD: 'Forgot password?',
    RESET_PASSWORD: 'Reset password',
    RESET_PASSWORD_LINK: 'We\'ll send you a link to reset your password',
    LOGIN_SUCCESS: 'Logged in successfully!'
  }
};

// Full French translation
export const LABELS_FR = {
  // Edit Listing Page
  editListingPage: {
    CREATE_LISTING: 'Créer une nouvelle annonce',
    EDIT_LISTING: 'Modifier l\'annonce',
    DELETE_DRAFT: 'Supprimer le brouillon',
    LISTINGS: 'Annonces',
    ADD_NEW_LISTING: 'Ajouter une nouvelle annonce',
    CANCEL: 'Annuler',
    SAVE_LISTING: 'Enregistrer l\'annonce',
    UPDATE_LISTING: 'Mettre à jour l\'annonce',
    SAVING: 'Enregistrement...',
    DRAFT_DELETED: 'Brouillon supprimé avec succès',
    CREATED_SUCCESS: 'Annonce créée avec succès !',
    UPDATED_SUCCESS: 'Annonce mise à jour avec succès !',
    
    // Form labels
    CATEGORY: 'Catégorie',
    TITLE: 'Titre',
    TITLE_PLACEHOLDER: 'Entrez le titre de l\'annonce',
    DESCRIPTION: 'Description',
    DESCRIPTION_PLACEHOLDER: 'Décrivez votre propriété',
    LOCATION: 'Emplacement',
    LOCATION_PLACEHOLDER: 'Entrez l\'emplacement',
    PRICE: 'Prix',
    PRICE_PER_MONTH: 'Prix par mois',
    PRICE_PER_NIGHT: 'Prix par nuit',
    PRICE_PLACEHOLDER: 'Entrez le prix',
    
    // Property details
    PROPERTY_TYPE: 'Type de propriété',
    BEDROOMS: 'Chambres',
    BATHROOMS: 'Salles de bain',
    AREA: 'Superficie (m²)',
    AMENITIES: 'Équipements',
    SELECTED: 'sélectionné',
    ADD_CUSTOM_AMENITY: 'Ajouter un équipement personnalisé',
    ADD: 'Ajouter',
    SHOW_LESS: 'Afficher moins',
    SHOW_MORE: 'Afficher plus',
    
    // Promotion package
    PROMOTION_PACKAGE: 'Forfait de promotion',
    YOUR_BALANCE: 'Votre solde',
    ACTIVE_PROMOTION: 'Forfait de promotion actif',
    FEATURED_FOR: 'En vedette pour',
    DAYS: 'jours',
    INSUFFICIENT_BALANCE: 'Solde insuffisant. Vous avez besoin de ₵',
    ADD_FUNDS: 'Ajouter des fonds',
    NEEDED: 'nécessaire',
    
    // Images
    IMAGES: 'Images',
    UPLOADING: 'Téléchargement...',
    DROP_IMAGES: 'Déposez les images ici',
    DRAG_IMAGES: 'Faites glisser les images ici ou cliquez pour télécharger',
    MAX_IMAGES: 'Maximum 6 images autorisées',
    
    // Validation errors
    REQUIRED_TITLE: 'Le titre est requis',
    REQUIRED_DESCRIPTION: 'La description est requise',
    REQUIRED_LOCATION: 'L\'emplacement est requis',
    PRICE_GREATER: 'Le prix doit être supérieur à 0',
    REQUIRED_IMAGE: 'Au moins une image est requise',
    REQUIRED_AMENITY: 'Sélectionnez au moins un équipement',
    REQUIRED_PROPERTY_TYPE: 'Le type de propriété est requis',
    REQUIRED_PACKAGE: 'Veuillez sélectionner un forfait de promotion',
    INSUFFICIENT_BALANCE_PACKAGE: 'Solde insuffisant pour le forfait de promotion sélectionné',
    
    // Modal
    LISTING_CREATED: 'Annonce créée avec succès !',
    LISTING_UPDATED: 'Annonce mise à jour avec succès !',
    VIEW_MY_LISTINGS: 'Voir mes annonces'
  },
  
  // AgentProfileCard Component
  agentProfileCardComponent: {
    SHOW_NUMBER: 'Afficher le numéro',
    MESSAGE: 'Message',
    VERIFIED_ACCOUNT: 'Compte vérifié',
    YOUR_RATING: 'Votre évaluation',
    RATE_AGENT: 'Évaluer l\'agent'
  },
  
  // Home Page
  homePage: {
    FEATURED_PROPERTIES: 'Propriétés en vedette',
    VIEW_ALL: 'Voir tout',
    POPULAR_LISTINGS: 'Annonces populaires',
    NEW_LISTINGS: 'Nouvelles annonces',
    SEARCH_PLACEHOLDER: 'Rechercher des propriétés...',
    NO_PROPERTIES: 'Aucune propriété disponible pour cette catégorie.'
  },
  
  // Shared Components
  shared: {
    LOADING: 'Chargement...',
    ERROR: 'Une erreur est survenue',
    RETRY: 'Réessayer',
    SUBMIT: 'Soumettre',
    SAVE: 'Enregistrer',
    CANCEL: 'Annuler',
    DELETE: 'Supprimer',
    EDIT: 'Modifier',
    VIEW: 'Voir',
    CLOSE: 'Fermer',
    CONFIRM: 'Confirmer',
    YES: 'Oui',
    NO: 'Non',
    CHANGE_LANGUAGE: 'Changer de langue',
    ACTIVE: 'Actif',
    // Navigation labels
    HOME: 'Accueil',
    FAVORITES: 'Favoris',
    MESSAGE: 'Message',
    SEARCH: 'Rechercher',
    ADD: 'Ajouter',
    PROFILE: 'Profil',
    LANGUAGE: 'Langue',
    // Search related
    RECENT_SEARCHES: 'Recherches récentes',
    NO_RESULTS: 'Aucun résultat trouvé',
    SEARCH_RESULTS: 'Résultats de recherche'
  },
  
  // Authentication related
  auth: {
    LOGIN: 'Connexion ou inscription',
    WELCOME: 'Bienvenue sur RentEasy',
    EMAIL: 'Email',
    CONTINUE_WITH_EMAIL: 'Continuer avec email',
    CONTINUE_WITH_GOOGLE: 'Continuer avec Google',
    CONTINUE_WITH_FACEBOOK: 'Continuer avec Facebook',
    CONTINUE_WITH_APPLE: 'Continuer avec Apple',
    OR: 'ou',
    FORGOT_PASSWORD: 'Mot de passe oublié?',
    RESET_PASSWORD: 'Réinitialiser le mot de passe',
    RESET_PASSWORD_LINK: 'Nous vous enverrons un lien pour réinitialiser votre mot de passe',
    LOGIN_SUCCESS: 'Connecté avec succès!'
  }
}; 