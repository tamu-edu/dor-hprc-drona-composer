echo "Extrating Components for Job Composer"
echo "." 
sleep 1.5 
echo "." 
sleep 1.5 
echo "."

mkdir jobwizzard 
mkdir jobwizzard/controllers jobwizzard/views

cp -r templates/ jobwizzard/
cp -r public/custom/js/ jobwizzard/
cp controllers/job_composer.rb jobwizzard/controllers/job_composer.rb
cp views/_job_config_form.erb jobwizzard/views/_job_config_form.erb

echo "cp -r templates ../templates -i
cp -r  controllers/. ../controllers/ -i
cp -r js/. ../public/custom/js/ -i
cp -r views/. ../views/ -i

sed -i  '3i\require '\"'\"'./controllers/job_composer'\"'\" ../config.ru
sed -i  '4i\use JobComposerController' ../config.ru

echo \"<div class="row-md-12 mt-4">
    <%== erb :"_job_config_form" %>
</div>\" >> ../views/index.erb
" >> jobwizzard/install.sh
chmod u+x jobwizzard/install.sh


