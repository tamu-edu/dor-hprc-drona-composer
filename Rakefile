require "rake/testtask"

Rake::TestTask.new(:test) do |t|
  t.libs << "test"
end

desc "run irb console"
task :console, :environment do |t, args|
  ENV['RACK_ENV'] = args[:environment] || 'development'
  exec "irb -r irb/completion -r ./app.rb"
end

task :default => :test
