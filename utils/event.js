const buildFeedPipeline = (user) => {
  const pref = user?.preferred || {};

  const userLat = user?.location?.coordinate?.latitude || 0;
  const userLng = user?.location?.coordinate?.longitude || 0;

  const city = user?.location?.city?.code;
  const country = user?.location?.country?.code;

  const pipeline = [];

  /**
   * CALCULATE DISTANCE (HAVERSINE SAFE VERSION)
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
                  $max: [
                    -1,
                    {
                      $min: [
                        1,
                        {
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
   * LOCATION SCORE
   */
  pipeline.push({
    $addFields: {
      locationScore: {
        $switch: {
          branches: [
            {
              case: {
                $and: [
                  { $eq: [pref.location, "nearby"] },
                  { $lte: ["$distance", 10] },
                ],
              },
              then: 100,
            },
            {
              case: {
                $and: [
                  { $eq: [pref.location, "city"] },
                  { $eq: ["$location.city.code", city] },
                ],
              },
              then: 80,
            },
            {
              case: {
                $and: [
                  { $eq: [pref.location, "country"] },
                  { $eq: ["$location.country.code", country] },
                ],
              },
              then: 60,
            },
            {
              case: { $eq: [pref.location, "worldwide"] },
              then: 40,
            },
          ],
          default: 0,
        },
      },
    },
  });

  /**
   * INTEREST SCORE
   */
  pipeline.push({
    $addFields: {
      interestScore: {
        $add: [
          {
            $cond: [
              { $eq: ["$classifications.category", pref.category] },
              5,
              0,
            ],
          },
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
        ],
      },
    },
  });

  /**
   * TOTAL SCORE
   */
  pipeline.push({
    $addFields: {
      score: {
        $add: ["$locationScore", "$interestScore"],
      },
    },
  });

  /**
   * SORT
   */
  pipeline.push({
    $sort: {
      locationScore: -1,
      interestScore: -1,
      distance: 1,
      "dates.start.date": 1,
    },
  });

  return pipeline;
};

module.exports = { buildFeedPipeline };
