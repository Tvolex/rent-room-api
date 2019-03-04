const tinify = require("tinify");
const fs = require('fs');
const ObjectId = require('mongodb').ObjectId;
const config = require('../../config');

tinify.key = config.TINIFY_API_KEY;

const optionsForS3Upload = {
    service: "s3",
    aws_access_key_id: config.AWS_ACCESS_KEY_ID,
    aws_secret_access_key: config.AWS_SECRET_ACCESS_KEY,
    region: config.AWS_S3_BUCKET_REGION,
};

const Tinify = async (image) => {

    tinify.validate(function(err) {
        if (err) return {
            type: 'error',
            message: "Validation of API key failed.",
            status: 500,
            valid: false,
        }
    });

    let source;
    try {
        source = await tinify.fromFile(image.path);
    } catch (err) {
        if (err instanceof tinify.AccountError) {
            return {
                type: 'error',
                message: "Verify your API key and account limit.",
                status: 500,
                valid: false,
            }
        }
        else if (err instanceof tinify.ClientError) {
            return {
                type: 'error',
                message: "Check your source image and request options.",
                status: 500,
                valid: false,
            }
        }
        else if (err instanceof tinify.ServerError) {
            return {
                type: 'error',
                message: "Temporary issue with the Tinify API.",
                status: 500,
                valid: false,
            }
        }
        else if (err instanceof tinify.ConnectionError) {
            return {
                type: 'error',
                message: "A network connection error occurred.",
                status: 500,
                valid: false,
            }
        }
        return {
            type: 'error',
            message: "Something went wrong",
            status: 500,
            valid: false,
        }
    }

    return {
        type: 'success',
        valid: true,
        source,
    }
};

const ErrorHandler = (err) => {
    console.error(err);
};

module.exports = {
    async photo (upload, cb) {
        if (!upload && !upload.path) {
            throw new Error('No such file').status = 400;
        }

        const { status, message, source, valid } = await Tinify(upload);

        const [ , type ] = upload.type.split('/');

        removeImageFromTemp(upload.path);

        if (!valid) {
            const err = new Error(message);
            err.status = status;
            throw err;
        }

        const name = ObjectId().toString();

        const fit = await source.resize({
            method: "fit",
            width: 1280,
            height: 720,
        });

        const thumb = await source.resize({
            method: "thumb",
            width: 150,
            height: 100,
        });

        const OriginalMeta = source.store({ ...optionsForS3Upload, path: `${config.AWS_S3_BUCKET_NAME}/images_original/${name}.${type}`}).meta()
            .catch(ErrorHandler);

        const FitMeta = fit.store({ ...optionsForS3Upload, path: `${config.AWS_S3_BUCKET_NAME}/images_fit/${name}.${type}` }).meta()
            .catch(ErrorHandler);

        const ThumbMeta = thumb.store({ ...optionsForS3Upload, path: `${config.AWS_S3_BUCKET_NAME}/images_thumb/${name}.${type}` }).meta()
            .catch(ErrorHandler);

        Promise.all([OriginalMeta, FitMeta, ThumbMeta]).then((values) => {
            const [ OriginalMeta, FitMeta, ThumbMeta ] = values;
            cb(name, { OriginalMeta, FitMeta, ThumbMeta });
        }).catch(err => {
            console.error(err);
            throw err;
        });

        return {
            _id: ObjectId(name),
            name,
            originalName: upload.originalFilename,
            type,
            status: "uploading",
            meta: {},
            count: tinify.compressionCount
        };
    },

    async avatar (image, cb) {
        if (!image && !image.path) {
            throw new Error('No such file').status = 400;
        }

        const { status, message, source, valid } = await Tinify(image);

        const [ , type ] = image.type.split('/');

        removeImageFromTemp(image.path);

        if (!valid) {
            const err = new Error(message);
            err.status = status;
            throw err;
        }

        const name = ObjectId().toString();

        const thumb = source.resize({
            method: "thumb",
            width: 150,
            height: 100,
        });

        const OriginalMeta = source.store({ ...optionsForS3Upload, path: `${config.AWS_S3_BUCKET_NAME}/images_original/${name}.${type}`}).meta()
            .then(meta => meta)
            .catch(ErrorHandler);

        const ThumbMeta = thumb.store({ ...optionsForS3Upload, path: `${config.AWS_S3_BUCKET_NAME}/images_thumb/${name}.${type}` }).meta()
            .then(meta => meta)
            .catch(ErrorHandler);


        Promise.all([OriginalMeta, ThumbMeta]).then((values) => {
            const [ OriginalMeta, ThumbMeta ] = values;
            cb(name, { OriginalMeta, ThumbMeta });
        }).catch(err => {
            console.error(err);
            throw err;
        });

        return {
            _id: ObjectId(name),
            name,
            originalName: image.originalFilename,
            type,
            status: "uploading",
            meta: {},
            count: tinify.compressionCount
        };
    },
};

const removeImageFromTemp = async (path) => {
    return fs.unlink(path, function (err) {
        if (err) console.error(err);
    });
}
