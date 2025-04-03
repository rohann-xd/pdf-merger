/**
 * Global error handler middleware
 */
module.exports = (err, req, res, next) => {
  console.error("Unhandled error:", err);

  // Send appropriate response
  res.status(500).render("index", {
    errorMessage: "Something went wrong. Please try again later.",
  });
};
