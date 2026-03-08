const buildFeedPipeline = (user) => {
  const pref = user?.preferred || {};

  const userLat = user?.location?.coordinate?.latitude || 0;
  const userLng = user?.location?.coordinate?.longitude || 0;

  const city = user?.location?.city?.code;
  const country = user?.location?.country?.code;

  const pipeline = [];

  /**
   * CALCULATE DISTANCE (HAVERSINE)
   */
  pipeline.push({
    $addFields: {
      distance: {
        $let: {
          vars: {
            lat1: userLat,
            lon1: userLng,
            lat2: "$location.coordinate.latitude",
            lon2: "$location.coordinate.longitude",
          },
          in: {
            $multiply: [
              6371,
              {
                $acos: {
                  $add: [
                    {
                      $multiply: [
                        { $sin: { $degreesToRadians: "$$lat1" } },
                        { $sin: { $degreesToRadians: "$$lat2" } },
                      ],
                    },
                    {
                      $multiply: [
                        { $cos: { $degreesToRadians: "$$lat1" } },
                        { $cos: { $degreesToRadians: "$$lat2" } },
                        {
                          $cos: {
                            $subtract: [
                              { $degreesToRadians: "$$lon2" },
                              { $degreesToRadians: "$$lon1" },
                            ],
                          },
                        },
                      ],
                    },
                  ],
                },
              },
            ],
          },
        },
      },
    },
  });

  /**
   * SCORE CALCULATION
   */
  pipeline.push({
    $addFields: {
      score: {
        $add: [
          /**
           * CATEGORY
           */
          {
            $cond: [
              { $eq: ["$classifications.category", pref.category] },
              5,
              0,
            ],
          },

          /**
           * SUBCATEGORY
           */
          {
            $multiply: [
              {
                $size: {
                  $setIntersection: [
                    "$classifications.subcategories",
                    pref.subcategories || [],
                  ],
                },
              },
              3,
            ],
          },

          /**
           * VIBE
           */
          {
            $multiply: [
              {
                $size: {
                  $setIntersection: ["$classifications.vibe", pref.vibe || []],
                },
              },
              2,
            ],
          },

          /**
           * VENUE
           */
          {
            $multiply: [
              {
                $size: {
                  $setIntersection: [
                    "$classifications.venue",
                    pref.venueType || [],
                  ],
                },
              },
              2,
            ],
          },

          /**
           * LOCATION PREFERENCE
           */
          {
            $switch: {
              branches: [
                {
                  case: {
                    $and: [
                      { $eq: [pref.location, "city"] },
                      { $eq: ["$location.city.code", city] },
                    ],
                  },
                  then: 5,
                },
                {
                  case: {
                    $and: [
                      { $eq: [pref.location, "country"] },
                      { $eq: ["$location.country.code", country] },
                    ],
                  },
                  then: 4,
                },
                {
                  case: { $eq: [pref.location, "worldwide"] },
                  then: 2,
                },
                {
                  case: {
                    $and: [
                      { $eq: [pref.location, "nearby"] },
                      { $lte: ["$distance", 10] }, // 10km
                    ],
                  },
                  then: 6,
                },
              ],
              default: 0,
            },
          },
        ],
      },
    },
  });

  pipeline.push({
    $sort: {
      score: -1,
      "dates.start.date": 1,
    },
  });

  return pipeline;
};

module.exports = { buildFeedPipeline };
