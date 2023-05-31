const Yup = require("yup");


// bruger Yup til at validere vores form vi får fra frontend inden vi sender den videre i programmet. 
// returnere status 422 = "unproccessable entity" hvis formen ikke er korrekt.

const formValidationMiddleware = (req, res, next) => {
  const formSchema = Yup.object({
    username: Yup.string()
      .required("Username needed")
      .min(6, "Username too short")
      .max(30, "Username too long"),
    password: Yup.string()
      .required("Password needed")
      .min(6, "Password too short")
      .max(50, "Password too long")
  });

  const formData = req.body;
  formSchema
    .validate(formData)
    .then(valid => {
      if (valid) {
        console.log("Form is valid");
        next();
      } else {
        return res.status(422).send();
      }
    })
    .catch(error => {
      console.log(error.errors);
      return res.status(422).send();
    });
};

module.exports = formValidationMiddleware;