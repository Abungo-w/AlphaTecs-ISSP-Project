const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);
    req.flash('error', err.message || 'An error occurred');
    res.redirect('back');
};

module.exports = errorHandler;
