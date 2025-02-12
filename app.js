// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
