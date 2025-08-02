const axios = require("axios");
const GOOGLE_MAP_KEY = process.env.GOOGLE_MAP_KEY;

exports.getLatLngForLocation = async (location) => {
  const res = await axios.get(
    `https://maps.googleapis.com/maps/api/geocode/json`,
    {
      params: {
        address: location,
        key: GOOGLE_MAP_KEY
      }
    }
  );
  const loc = res.data.results[0]?.geometry?.location;
  return { latitude: loc.lat, longitude: loc.lng };
};

exports.getNearbyCities = async (location) => {
  // Basic manual fallback for Bangalore
  if (location.toLowerCase() === "bangalore") {
    return ["Whitefield", "Electronic City", "Hosur", "Yelahanka"];
  }
  return [];
};
